// export const Modal = ({ isOpen, onClose, title, children }) => {
//     if (!isOpen) return null;

//     return (
//         <div className="modal-overlay">
//             <div className="modal">
//                 <div className="modal-header">
//                     <h2>{title}</h2>
//                     <button onClick={onClose} className="close-btn">
//                         <i className="fas fa-times">❌</i>
//                     </button>
//                 </div>
//                 <div className="modal-content" style={{ marginLeft: "20px" }}>
//                     {children}
//                 </div>
//             </div>
//         </div>
//     );
// };

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{
                            padding: '0',
                            overflow: 'hidden',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            paddingBottom: '20px'
                        }}>
                <div className="modal-header">
                    <h2>{title}</h2>

                    <button type="button" onClick={onClose} className="close-btn">
                        <i className="fas fa-times">❌</i>
                    </button>
                </div>

                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};